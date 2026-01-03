-- ============================================================================
-- CLEAN MAX v4.2 - SUPABASE DATABASE SCHEMA (РАСШИРЕННАЯ)
-- ============================================================================
-- Silicon Valley Edition: Duolingo + Notion + Linear фишки
-- Создать в Supabase SQL Editor

-- ============================================================================
-- 1. ДЕТИ (Children) - расширенная с XP и уровнями
-- ============================================================================
CREATE TABLE children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👦',
  age INTEGER,
  active BOOLEAN DEFAULT true,
  base_weekly INTEGER DEFAULT 500,
  
  -- Геймификация
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. НАСТРОЙКИ (Settings)
-- ============================================================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ============================================================================
-- 3. ДНИ (Days) - расширенные с комнатой по чекбоксам
-- ============================================================================
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  
  -- Комната (5 чекбоксов)
  room_bed BOOLEAN DEFAULT false,
  room_floor BOOLEAN DEFAULT false,
  room_desk BOOLEAN DEFAULT false,
  room_closet BOOLEAN DEFAULT false,
  room_trash BOOLEAN DEFAULT false,
  room_score INTEGER DEFAULT 0, -- рассчитывается: сумма чекбоксов
  room_ok BOOLEAN DEFAULT false, -- >= 3
  
  -- Поведение и дневник
  good_behavior BOOLEAN DEFAULT true,
  diary_not_done BOOLEAN DEFAULT false,
  
  -- Заметки
  note_parent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- ============================================================================
-- 4. ОЦЕНКИ ПО ПРЕДМЕТАМ (Subject Grades)
-- ============================================================================
CREATE TABLE subject_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 2 AND grade <= 5),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. КЕШ ПРЕДМЕТОВ (для автокомплита)
-- ============================================================================
CREATE TABLE subjects_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  subject TEXT NOT NULL,
  last_seen DATE,
  frequency INTEGER DEFAULT 1,
  UNIQUE(child_id, subject)
);

-- ============================================================================
-- 6. СПОРТ ДОМАШНИЙ (Home Sports) - НОВОЕ!
-- ============================================================================
CREATE TABLE home_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  
  -- Виды активности
  running BOOLEAN DEFAULT false,
  exercises BOOLEAN DEFAULT false,
  outdoor_games BOOLEAN DEFAULT false,
  stretching BOOLEAN DEFAULT false,
  
  -- Время в минутах
  total_minutes INTEGER DEFAULT 0,
  
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- ============================================================================
-- 7. СЕКЦИИ (Sports Sections) - НОВОЕ!
-- ============================================================================
CREATE TABLE sports_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  name TEXT NOT NULL, -- футбол, карате, плавание
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. ПОСЕЩЕНИЯ СЕКЦИЙ (Section Attendance) - НОВОЕ!
-- ============================================================================
CREATE TABLE section_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sports_sections(id),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  attended BOOLEAN DEFAULT true,
  coach_rating INTEGER CHECK (coach_rating >= 1 AND coach_rating <= 5),
  coach_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(section_id, date)
);

-- ============================================================================
-- 9. ЦЕЛИ (Goals)
-- ============================================================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  title TEXT NOT NULL,
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. ЛОГ ИЗМЕНЕНИЙ ЦЕЛЕЙ (Goal Log)
-- ============================================================================
CREATE TABLE goal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id),
  child_id TEXT REFERENCES children(id),
  action TEXT NOT NULL,
  amount INTEGER,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 11. НЕДЕЛИ (Weeks) - закрытые периоды
-- ============================================================================
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Флаги
  all5_mode BOOLEAN DEFAULT false, -- режим "все пятёрки"
  
  -- Родительские поля
  extra_bonus INTEGER DEFAULT 0,
  penalties_manual INTEGER DEFAULT 0,
  note_parent TEXT,
  
  -- Breakdown расчёта
  base INTEGER,
  study_total INTEGER,
  room_bonus INTEGER,
  sport_bonus INTEGER, -- НОВОЕ!
  streak_bonuses INTEGER,
  extra_applied INTEGER,
  penalties_total INTEGER,
  total INTEGER,
  
  -- Статус
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, week_start)
);

-- ============================================================================
-- 12. СТРИКИ (Streaks) - кеш для быстрого доступа
-- ============================================================================
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  streak_type TEXT NOT NULL, -- room, study, sport, strong_week
  current_count INTEGER DEFAULT 0,
  best_count INTEGER DEFAULT 0,
  last_updated DATE,
  active BOOLEAN DEFAULT true,
  UNIQUE(child_id, streak_type)
);

-- ============================================================================
-- 13. ДОСТИЖЕНИЯ (Achievements/Badges)
-- ============================================================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  badge_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji
  xp_reward INTEGER DEFAULT 0,
  earned_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 14. РЕКОРДЫ (Records)
-- ============================================================================
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  record_key TEXT NOT NULL,
  value INTEGER NOT NULL,
  date_achieved DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, record_key)
);

-- ============================================================================
-- 15. ЧЕЛЛЕНДЖИ (Challenges) - НОВОЕ!
-- ============================================================================
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- week_excellent, perfect_room, sport_week
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  reward INTEGER DEFAULT 0, -- в рублях
  active BOOLEAN DEFAULT true,
  completed BOOLEAN DEFAULT false,
  week_start DATE,
  week_end DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ИНДЕКСЫ для производительности
-- ============================================================================
CREATE INDEX idx_days_child_date ON days(child_id, date DESC);
CREATE INDEX idx_subject_grades_child_date ON subject_grades(child_id, date DESC);
CREATE INDEX idx_home_sports_child_date ON home_sports(child_id, date DESC);
CREATE INDEX idx_section_attendance_child_date ON section_attendance(child_id, date DESC);
CREATE INDEX idx_weeks_child_date ON weeks(child_id, week_start DESC);
CREATE INDEX idx_goals_child_active ON goals(child_id, active) WHERE NOT archived;
CREATE INDEX idx_streaks_child ON streaks(child_id);
CREATE INDEX idx_challenges_child_active ON challenges(child_id, active) WHERE NOT completed;

-- ============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================================================

-- Дети
INSERT INTO children (id, name, emoji, age, base_weekly, xp, level) VALUES
  ('adam', 'Адам', '👦', 11, 500, 0, 1),
  ('alim', 'Алим', '👶', 9, 500, 0, 1);

-- Настройки
INSERT INTO settings (key, value) VALUES
  -- Базовые
  ('baseWeekly', '500'),
  ('bonusAll5', '500'),
  
  -- Оценки
  ('per5', '50'),
  ('per4', '10'),
  ('pen3', '-50'),
  ('pen2', '-100'),
  ('diaryPenalty', '-50'),
  
  -- Комната
  ('room5of7', '50'),
  ('room7of7', '100'),
  
  -- Стрики
  ('roomStreak7', '100'),
  ('studyStreak14', '100'),
  ('sportStreak7', '100'),
  ('strongWeekBonus', '200'),
  ('monthStabilityBonus', '500'),
  
  -- Спорт (НОВОЕ!)
  ('sportEnabled', 'true'),
  ('sportPerSession', '30'),
  ('sportBonusWeek', '150'),
  ('sectionAttendanceBonus', '50'),
  
  -- Геймификация
  ('xpPerGrade5', '100'),
  ('xpPerGrade4', '50'),
  ('xpPerRoomClean', '30'),
  ('xpPerSportSession', '40'),
  ('xpToLevelUp', '1000');

-- Примеры секций
INSERT INTO sports_sections (child_id, name, active) VALUES
  ('adam', 'Футбол', true),
  ('alim', 'Карате', true);

-- Начальные стрики
INSERT INTO streaks (child_id, streak_type, current_count, best_count, last_updated) VALUES
  ('adam', 'room', 0, 0, CURRENT_DATE),
  ('adam', 'study', 0, 0, CURRENT_DATE),
  ('adam', 'sport', 0, 0, CURRENT_DATE),
  ('alim', 'room', 0, 0, CURRENT_DATE),
  ('alim', 'study', 0, 0, CURRENT_DATE),
  ('alim', 'sport', 0, 0, CURRENT_DATE);

-- ============================================================================
-- RLS (Row Level Security) POLICIES
-- ============================================================================

-- Включить RLS на всех таблицах
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Публичный доступ для чтения (для демо)
CREATE POLICY "Public read access" ON children FOR SELECT USING (true);
CREATE POLICY "Public read access" ON settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON days FOR SELECT USING (true);
CREATE POLICY "Public read access" ON subject_grades FOR SELECT USING (true);
CREATE POLICY "Public read access" ON subjects_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON home_sports FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sports_sections FOR SELECT USING (true);
CREATE POLICY "Public read access" ON section_attendance FOR SELECT USING (true);
CREATE POLICY "Public read access" ON goals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON goal_log FOR SELECT USING (true);
CREATE POLICY "Public read access" ON weeks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON streaks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON badges FOR SELECT USING (true);
CREATE POLICY "Public read access" ON records FOR SELECT USING (true);
CREATE POLICY "Public read access" ON challenges FOR SELECT USING (true);

-- Публичный доступ для записи (для демо - в продакшене использовать JWT)
CREATE POLICY "Public write access" ON children FOR ALL USING (true);
CREATE POLICY "Public write access" ON settings FOR ALL USING (true);
CREATE POLICY "Public write access" ON days FOR ALL USING (true);
CREATE POLICY "Public write access" ON subject_grades FOR ALL USING (true);
CREATE POLICY "Public write access" ON subjects_cache FOR ALL USING (true);
CREATE POLICY "Public write access" ON home_sports FOR ALL USING (true);
CREATE POLICY "Public write access" ON sports_sections FOR ALL USING (true);
CREATE POLICY "Public write access" ON section_attendance FOR ALL USING (true);
CREATE POLICY "Public write access" ON goals FOR ALL USING (true);
CREATE POLICY "Public write access" ON goal_log FOR ALL USING (true);
CREATE POLICY "Public write access" ON weeks FOR ALL USING (true);
CREATE POLICY "Public write access" ON streaks FOR ALL USING (true);
CREATE POLICY "Public write access" ON badges FOR ALL USING (true);
CREATE POLICY "Public write access" ON records FOR ALL USING (true);
CREATE POLICY "Public write access" ON challenges FOR ALL USING (true);

-- ============================================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКИХ РАСЧЁТОВ
-- ============================================================================

-- Функция обновления room_score при изменении чекбоксов
CREATE OR REPLACE FUNCTION update_room_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.room_score := (
    CASE WHEN NEW.room_bed THEN 1 ELSE 0 END +
    CASE WHEN NEW.room_floor THEN 1 ELSE 0 END +
    CASE WHEN NEW.room_desk THEN 1 ELSE 0 END +
    CASE WHEN NEW.room_closet THEN 1 ELSE 0 END +
    CASE WHEN NEW.room_trash THEN 1 ELSE 0 END
  );
  NEW.room_ok := NEW.room_score >= 3;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_score_trigger
BEFORE INSERT OR UPDATE ON days
FOR EACH ROW
EXECUTE FUNCTION update_room_score();

-- ============================================================================
-- ГОТОВО! Схема создана со всеми фишками Silicon Valley! 🚀
-- ============================================================================
