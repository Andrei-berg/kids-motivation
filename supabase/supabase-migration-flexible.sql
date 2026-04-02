-- ============================================================================
-- МИГРАЦИЯ: Гибкие настройки (Предметы, Расписание, Упражнения)
-- ============================================================================
-- Выполнить в Supabase SQL Editor ПОСЛЕ основной схемы

-- ============================================================================
-- 1. ПРЕДМЕТЫ (Subjects) - индивидуальные для каждого ребенка
-- ============================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  archived BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  UNIQUE(child_id, name)
);

CREATE INDEX idx_subjects_child ON subjects(child_id);
CREATE INDEX idx_subjects_active ON subjects(child_id, active) WHERE active = true AND archived = false;

-- ============================================================================
-- 2. РАСПИСАНИЕ (Schedule) - фиксированное расписание уроков
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 1=пн, 2=вт, 3=ср, 4=чт, 5=пт
  lesson_number INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6, 7...
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, day_of_week, lesson_number)
);

CREATE INDEX idx_schedule_child ON schedule(child_id);
CREATE INDEX idx_schedule_day ON schedule(child_id, day_of_week);

-- ============================================================================
-- 3. ТИПЫ УПРАЖНЕНИЙ (Exercise Types) - общий список
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  track_quantity BOOLEAN DEFAULT true,
  unit TEXT DEFAULT 'раз', -- раз, мин, км
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exercise_types_active ON exercise_types(active) WHERE active = true;

-- ============================================================================
-- 4. ДОМАШНИЕ УПРАЖНЕНИЯ (Home Exercises) - замена home_sports
-- ============================================================================
CREATE TABLE IF NOT EXISTS home_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercise_type_id UUID REFERENCES exercise_types(id) ON DELETE CASCADE,
  quantity INTEGER, -- количество (30 отжиманий, 15 минут)
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, date, exercise_type_id)
);

CREATE INDEX idx_home_exercises_child_date ON home_exercises(child_id, date);

-- ============================================================================
-- 5. ОБНОВЛЕНИЕ ОЦЕНОК - ссылка на предметы
-- ============================================================================
-- Добавляем колонку subject_id в subject_grades (опционально)
-- Сейчас оставляем subject как TEXT, но в будущем можно мигрировать на UUID
ALTER TABLE subject_grades 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);

-- ============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================================================

-- Дефолтные типы упражнений
INSERT INTO exercise_types (name, track_quantity, unit, display_order) VALUES
  ('Бег', true, 'мин', 1),
  ('Отжимания', true, 'раз', 2),
  ('Турник (подтягивания)', true, 'раз', 3),
  ('Пресс', true, 'раз', 4),
  ('Растяжка', true, 'мин', 5),
  ('Приседания', true, 'раз', 6),
  ('Планка', true, 'сек', 7),
  ('Скакалка', true, 'мин', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ФУНКЦИЯ: Создать дефолтные предметы для ребенка
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_subjects(p_child_id TEXT, p_grade INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Предметы для начальной школы (1-4 класс)
  IF p_grade <= 4 THEN
    INSERT INTO subjects (child_id, name, display_order) VALUES
      (p_child_id, 'Математика', 1),
      (p_child_id, 'Русский язык', 2),
      (p_child_id, 'Литературное чтение', 3),
      (p_child_id, 'Окружающий мир', 4),
      (p_child_id, 'Английский язык', 5),
      (p_child_id, 'ИЗО', 6),
      (p_child_id, 'Музыка', 7),
      (p_child_id, 'Технология', 8),
      (p_child_id, 'Физкультура', 9)
    ON CONFLICT (child_id, name) DO NOTHING;
  
  -- Предметы для средней школы (5-9 класс)
  ELSIF p_grade <= 9 THEN
    INSERT INTO subjects (child_id, name, display_order) VALUES
      (p_child_id, 'Математика', 1),
      (p_child_id, 'Русский язык', 2),
      (p_child_id, 'Литература', 3),
      (p_child_id, 'Английский язык', 4),
      (p_child_id, 'История', 5),
      (p_child_id, 'География', 6),
      (p_child_id, 'Биология', 7),
      (p_child_id, 'Физика', 8),
      (p_child_id, 'Химия', 9),
      (p_child_id, 'Информатика', 10),
      (p_child_id, 'Обществознание', 11),
      (p_child_id, 'ИЗО', 12),
      (p_child_id, 'Музыка', 13),
      (p_child_id, 'Технология', 14),
      (p_child_id, 'Физкультура', 15)
    ON CONFLICT (child_id, name) DO NOTHING;
  
  -- Предметы для старшей школы (10-11 класс)
  ELSE
    INSERT INTO subjects (child_id, name, display_order) VALUES
      (p_child_id, 'Математика', 1),
      (p_child_id, 'Русский язык', 2),
      (p_child_id, 'Литература', 3),
      (p_child_id, 'Английский язык', 4),
      (p_child_id, 'История', 5),
      (p_child_id, 'География', 6),
      (p_child_id, 'Биология', 7),
      (p_child_id, 'Физика', 8),
      (p_child_id, 'Химия', 9),
      (p_child_id, 'Информатика', 10),
      (p_child_id, 'Обществознание', 11),
      (p_child_id, 'ОБЖ', 12),
      (p_child_id, 'Физкультура', 13),
      (p_child_id, 'Астрономия', 14)
    ON CONFLICT (child_id, name) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Создать дефолтные предметы для существующих детей
-- ============================================================================
-- Адам (11 лет, ~5 класс)
SELECT create_default_subjects('adam', 5);

-- Алим (9 лет, ~3 класс)
SELECT create_default_subjects('alim', 3);

-- ============================================================================
-- ГОТОВО! 
-- ============================================================================
-- Теперь можно:
-- 1. Управлять предметами для каждого ребенка
-- 2. Создавать расписание уроков
-- 3. Кастомизировать упражнения
