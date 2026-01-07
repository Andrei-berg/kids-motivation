-- ============================================================================
-- STEP 3: РАСХОДЫ И СЕКЦИИ
-- ============================================================================

-- 1. КАТЕГОРИИ РАСХОДОВ
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. РАСХОДЫ
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_period TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. СЕКЦИИ/КРУЖКИ
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT NOT NULL,
  name TEXT NOT NULL,
  schedule JSONB,
  cost DECIMAL(10, 2),
  trainer TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ПОСЕЩЕНИЯ СЕКЦИЙ
CREATE TABLE IF NOT EXISTS section_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  attended BOOLEAN NOT NULL,
  progress_note TEXT,
  trainer_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, date)
);

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_child_id ON expenses(child_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_sections_child_id ON sections(child_id);
CREATE INDEX IF NOT EXISTS idx_section_visits_section_id ON section_visits(section_id);
CREATE INDEX IF NOT EXISTS idx_section_visits_date ON section_visits(date);

-- ============================================================================
-- ПРЕДУСТАНОВЛЕННЫЕ КАТЕГОРИИ
-- ============================================================================

INSERT INTO expense_categories (name, icon, is_default, is_active) VALUES
('Образование', '🎓', true, true),
('Спорт', '🏃', true, true),
('Творчество', '🎨', true, true),
('Одежда', '👕', true, true),
('Здоровье', '🏥', true, true),
('Развлечения', '🎮', true, true),
('Инвентарь', '🎒', true, true),
('Репетиторы', '📚', true, true),
('Порча/Поломка', '💔', true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS (Row Level Security) - опционально
-- ============================================================================

-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE section_visits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ПРОВЕРКА
-- ============================================================================

-- Проверить что таблицы созданы:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('expense_categories', 'expenses', 'sections', 'section_visits')
ORDER BY table_name;

-- Проверить предустановленные категории:
SELECT name, icon, is_active FROM expense_categories WHERE is_default = true;
