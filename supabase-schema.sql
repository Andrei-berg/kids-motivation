-- ============================================================================
-- CLEAN MAX v4 - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Создать эти таблицы в Supabase SQL Editor

-- 1. Дети (Children)
CREATE TABLE children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👦',
  age INTEGER,
  active BOOLEAN DEFAULT true,
  base_weekly INTEGER DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Настройки (Settings)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 3. Дни (Days) - ежедневные записи
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  room_clean BOOLEAN DEFAULT false,
  diary_done BOOLEAN DEFAULT false,
  note_parent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- 4. Оценки по предметам
CREATE TABLE subject_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 2 AND grade <= 5),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Кеш предметов
CREATE TABLE subjects_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  subject TEXT NOT NULL,
  last_seen DATE,
  UNIQUE(child_id, subject)
);

-- 6. Цели (Goals)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  title TEXT NOT NULL,
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Лог изменений целей
CREATE TABLE goal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id),
  child_id TEXT REFERENCES children(id),
  action TEXT NOT NULL,
  before_value INTEGER,
  after_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Недели (закрытые периоды)
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  all5 BOOLEAN DEFAULT false,
  extra_bonus INTEGER DEFAULT 0,
  penalties_manual INTEGER DEFAULT 0,
  note_parent TEXT,
  base INTEGER,
  study_total INTEGER,
  room_bonus INTEGER,
  streak_bonuses INTEGER,
  extra_applied INTEGER,
  penalties_total INTEGER,
  total INTEGER,
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, week_start)
);

-- 9. Достижения (Badges)
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  badge_key TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT,
  earned_at TIMESTAMP DEFAULT NOW()
);

-- 10. Рекорды
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  record_key TEXT NOT NULL,
  value INTEGER NOT NULL,
  date_achieved DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, record_key)
);

-- ============================================================================
-- ИНДЕКСЫ для производительности
-- ============================================================================

CREATE INDEX idx_days_child_date ON days(child_id, date DESC);
CREATE INDEX idx_subject_grades_child_date ON subject_grades(child_id, date DESC);
CREATE INDEX idx_weeks_child_date ON weeks(child_id, week_start DESC);
CREATE INDEX idx_goals_child_active ON goals(child_id, active) WHERE NOT archived;

-- ============================================================================
-- ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
-- ============================================================================

-- Дети
INSERT INTO children (id, name, emoji, age, base_weekly) VALUES
  ('adam', 'Адам', '👦', 11, 500),
  ('alim', 'Алим', '👶', 9, 500);

-- Настройки по умолчанию
INSERT INTO settings (key, value) VALUES
  ('baseWeekly', '500'),
  ('bonusAll5', '500'),
  ('per5', '50'),
  ('per4', '10'),
  ('pen3', '-50'),
  ('pen2', '-100'),
  ('diaryPenalty', '-50'),
  ('room5of7', '50'),
  ('room7of7', '100'),
  ('roomStreak7', '100'),
  ('studyStreak14', '100'),
  ('strongWeekBonus', '200'),
  ('monthStabilityBonus', '500'),
  ('sportEnabled', 'false'),
  ('sportSoonTitle', '🏋️ Скоро включим (со следующего года)'),
  ('sportSoonNote', 'Будут бонусы за тренировки, серии силы и медали спортсмена.');

-- ============================================================================
-- RLS (Row Level Security) POLICIES
-- ============================================================================
-- Включить RLS на всех таблицах для безопасности

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем (для демо)
-- В продакшене настроить более строгие политики
CREATE POLICY "Allow public read" ON children FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON days FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON subject_grades FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON subjects_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON goals FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON goal_log FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON weeks FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON badges FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON records FOR SELECT USING (true);

-- Разрешить запись всем (для демо)
-- В продакшене использовать service_role или JWT токены
CREATE POLICY "Allow public insert" ON children FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON days FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON subject_grades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON subjects_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON goal_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON weeks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON badges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON records FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON children FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON settings FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON days FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON subject_grades FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON subjects_cache FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON goals FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON goal_log FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON weeks FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON badges FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON records FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON children FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON settings FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON days FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON subject_grades FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON subjects_cache FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON goals FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON goal_log FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON weeks FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON badges FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON records FOR DELETE USING (true);
